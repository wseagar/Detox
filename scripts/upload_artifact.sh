#!/bin/bash -e

export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=$AWS_ACCESS_SECRET

echo "Artifacts publishing scripts started"

DATE=`date '+%Y-%m-%d_%H-%M-%S'`

if [ $JENKINS_CI ]; then
  ARTIFACTS_NAME="artifacts_${BUILD_ID}_${DATE}.tar.gz"
else
  ARTIFACTS_NAME="artifacts_${TRAVIS_BUILD_ID}_${DATE}.tar.gz"
fi

if [ -d "detox/test/artifacts" ]; then
  tar cvzf ${ARTIFACTS_NAME} ./detox/test/artifacts/

  if [ $JENKINS_CI ]; then
      echo "Jenkins has a built-in plugin"
  else
      aws s3 cp ${ARTIFACTS_NAME} s3://detox-artifacts/ --region=us-east-1
  fi
  ARTIFACTS_URL="https://detox-artifacts.s3.amazonaws.com/${ARTIFACTS_NAME}"

  echo "The artifacts archive is available for download at:"
  echo "${ARTIFACTS_URL}"

  if [ $JENKINS_CI ]; then
    {
      echo "<section name=\"Performance Summary\" fontcolor=\"#ffffff\">"
      echo "  <field name=\"Field Name To Display\" titlecolor=\"black\" value=\"My Field Value\" detailcolor=\"#000000\" href=\"./${ARTIFACTS_NAME}\">"
      echo "  </field>"
      echo "</section>"
    } > "artifacts-info.xml"

#    {
#      echo "<section name=\"Test artifacts info\">"
#      echo "  <field name=\"Artifacts URL\" titlecolor=\"black\" value=\"${ARTIFACTS_URL}\">"
#      echo "  <field name=\"Artifacts URL\" titlecolor=\"black\" value=\"Some value\">"
#      echo "    <![CDATA[ <a href=\"${ARTIFACTS_URL}\">${ARTIFACTS_URL}</a> ]]>"
#      echo "  </field>"
#      echo "</section>"
#    } > "artifacts_info.xml"
  fi
fi
